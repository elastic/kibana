'use strict';

const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'reviewer-command';
const ARTIFACT_PATH = path.join(ARTIFACT_DIR, 'command.json');
const SKIP_LABEL = 'reviewer:skip-ai';

const REVIEWERS = Object.freeze({
  codex: Object.freeze({
    id: 'codex',
    command: '@codex',
    label: 'reviewer:codex',
    workflowId: 'reviewer-codex.lock.yml',
  }),
  claude: Object.freeze({
    id: 'claude',
    command: '@claude',
    label: 'reviewer:claude',
    workflowId: 'reviewer-claude.lock.yml',
  }),
});

const allowedPermissions = new Set(['admin', 'maintain', 'write']);
const allowedRoles = new Set(['admin', 'maintain', 'write']);

const getLabelNames = (labels = []) => labels.map((label) => label.name);

const parseReviewerCommand = (body = '') => {
  const reviewers = Object.values(REVIEWERS);
  return reviewers.find((reviewer) => body.includes(reviewer.command));
};

const isAllowedPermission = (permission) =>
  allowedPermissions.has(permission.permission) || allowedRoles.has(permission.role_name);

const getPayloadPrNumber = (context) =>
  context.payload.issue?.pull_request ? context.payload.issue.number : context.payload.pull_request?.number;

const getPayloadComment = (context) => context.payload.comment;

const getCollaboratorPermission = async ({ github, owner, repo, username }) => {
  try {
    const response = await github.rest.repos.getCollaboratorPermissionLevel({
      owner,
      repo,
      username,
    });
    return response.data;
  } catch (error) {
    if (error.status === 404) {
      return undefined;
    }

    throw error;
  }
};

const getPullRequest = async ({ github, owner, repo, pullNumber }) => {
  const response = await github.rest.pulls.get({
    owner,
    repo,
    pull_number: pullNumber,
  });
  return response.data;
};

const fetchLiveComment = async ({ github, owner, repo, commentType, commentId }) => {
  if (commentType === 'issue_comment') {
    const response = await github.rest.issues.getComment({
      owner,
      repo,
      comment_id: commentId,
    });
    return response.data;
  }

  if (commentType === 'pull_request_review_comment') {
    const response = await github.rest.pulls.getReviewComment({
      owner,
      repo,
      comment_id: commentId,
    });
    return response.data;
  }

  throw new Error(`Unsupported comment type: ${commentType}`);
};

const commentBelongsToPr = ({ comment, commentType, pullNumber }) => {
  if (commentType === 'issue_comment') {
    return comment.issue_url?.endsWith(`/issues/${pullNumber}`);
  }

  return comment.pull_request_url?.endsWith(`/pulls/${pullNumber}`);
};

const validateReviewerAccess = async ({ github, core, owner, repo, actor }) => {
  const permission = await getCollaboratorPermission({ github, owner, repo, username: actor });
  if (!permission) {
    core.info(`${actor} is not a repository collaborator.`);
    return false;
  }

  if (!isAllowedPermission(permission)) {
    core.info(`${actor} does not have reviewer command permission.`);
    return false;
  }

  return true;
};

const validatePullRequest = ({ core, pullRequest, reviewer }) => {
  if (pullRequest.state !== 'open') {
    core.info(`PR #${pullRequest.number} is not open.`);
    return false;
  }

  const labelNames = getLabelNames(pullRequest.labels);
  if (labelNames.includes(SKIP_LABEL)) {
    core.info(`PR #${pullRequest.number} has ${SKIP_LABEL}.`);
    return false;
  }

  if (!labelNames.includes(reviewer.label)) {
    core.info(`PR #${pullRequest.number} does not have ${reviewer.label}.`);
    return false;
  }

  return true;
};

const buildCommandArtifact = ({ context, owner, repo, reviewer, pullNumber, actor }) => {
  const comment = getPayloadComment(context);

  return {
    version: 1,
    repository: `${owner}/${repo}`,
    reviewer: reviewer.id,
    command: reviewer.command,
    reviewer_label: reviewer.label,
    workflow_id: reviewer.workflowId,
    pr_number: String(pullNumber),
    actor,
    comment_id: String(comment.id),
    comment_type: context.eventName,
    comment_url: comment.html_url ?? '',
    comment_path: comment.path ?? '',
    comment_line: comment.line ? String(comment.line) : '',
    comment_side: comment.side ?? '',
    comment_start_line: comment.start_line ? String(comment.start_line) : '',
    comment_start_side: comment.start_side ?? '',
    comment_in_reply_to_id: comment.in_reply_to_id ? String(comment.in_reply_to_id) : '',
  };
};

const buildCommentContextInput = ({ artifact, liveComment, pullRequest }) =>
  JSON.stringify({
    version: 1,
    reviewer: artifact.reviewer,
    command: artifact.command,
    pr_number: String(pullRequest.number),
    pr_url: pullRequest.html_url,
    pr_head_sha: pullRequest.head.sha,
    actor: artifact.actor,
    comment_id: String(liveComment.id),
    comment_type: artifact.comment_type,
    comment_url: liveComment.html_url ?? artifact.comment_url ?? '',
    comment_path: liveComment.path ?? artifact.comment_path ?? '',
    comment_line: liveComment.line ? String(liveComment.line) : artifact.comment_line ?? '',
    comment_side: liveComment.side ?? artifact.comment_side ?? '',
    comment_start_line: liveComment.start_line
      ? String(liveComment.start_line)
      : artifact.comment_start_line ?? '',
    comment_start_side: liveComment.start_side ?? artifact.comment_start_side ?? '',
    comment_in_reply_to_id: liveComment.in_reply_to_id
      ? String(liveComment.in_reply_to_id)
      : artifact.comment_in_reply_to_id ?? '',
    comment_author: liveComment.user?.login ?? '',
  });

const routeReviewerCommand = async ({ context, core }) => {
  const { owner, repo } = context.repo;
  const comment = getPayloadComment(context);
  const reviewer = parseReviewerCommand(comment?.body);

  if (!reviewer) {
    core.info('Comment does not contain a configured reviewer mention.');
    core.setOutput('matched', 'false');
    return;
  }

  const pullNumber = getPayloadPrNumber(context);
  const actor = context.payload.sender?.login;
  if (!pullNumber || !actor) {
    core.info('Reviewer command is missing pull request or actor context.');
    core.setOutput('matched', 'false');
    return;
  }

  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(
    ARTIFACT_PATH,
    `${JSON.stringify(buildCommandArtifact({ context, owner, repo, reviewer, pullNumber, actor }), null, 2)}\n`
  );
  core.setOutput('matched', 'true');
};

const readCommandArtifact = () => {
  if (!fs.existsSync(ARTIFACT_PATH)) {
    return undefined;
  }

  return JSON.parse(fs.readFileSync(ARTIFACT_PATH, 'utf8'));
};

const dispatchReviewerCommand = async ({ github, context, core }) => {
  const artifact = readCommandArtifact();
  if (!artifact) {
    core.info('No reviewer command artifact found.');
    return;
  }

  const { owner, repo } = context.repo;
  const expectedRepository = `${owner}/${repo}`;
  if (artifact.repository !== expectedRepository) {
    core.setFailed(`Artifact repository ${artifact.repository} did not match ${expectedRepository}.`);
    return;
  }

  const reviewer = REVIEWERS[artifact.reviewer];
  if (!reviewer || artifact.workflow_id !== reviewer.workflowId) {
    core.setFailed(`Unsupported reviewer in artifact: ${artifact.reviewer}`);
    return;
  }

  const pullNumber = Number.parseInt(artifact.pr_number, 10);
  const commentId = Number.parseInt(artifact.comment_id, 10);
  if (!Number.isInteger(pullNumber) || !Number.isInteger(commentId)) {
    core.setFailed('Reviewer command artifact did not contain valid PR/comment ids.');
    return;
  }

  const pullRequest = await getPullRequest({ github, owner, repo, pullNumber });
  if (!validatePullRequest({ core, pullRequest, reviewer })) {
    return;
  }

  if (!(await validateReviewerAccess({ github, core, owner, repo, actor: artifact.actor }))) {
    return;
  }

  const liveComment = await fetchLiveComment({
    github,
    owner,
    repo,
    commentType: artifact.comment_type,
    commentId,
  });

  if (!commentBelongsToPr({ comment: liveComment, commentType: artifact.comment_type, pullNumber })) {
    core.setFailed(`Comment ${commentId} does not belong to PR #${pullNumber}.`);
    return;
  }

  const liveReviewer = parseReviewerCommand(liveComment.body);
  if (!liveReviewer) {
    core.info(`Comment ${commentId} no longer contains a reviewer mention.`);
    return;
  }

  if (liveReviewer.id !== reviewer.id) {
    core.setFailed(`Artifact reviewer ${reviewer.id} did not match live command ${liveReviewer.id}.`);
    return;
  }

  await github.rest.actions.createWorkflowDispatch({
    owner,
    repo,
    workflow_id: reviewer.workflowId,
    ref: context.payload.repository.default_branch,
    inputs: {
      pr_number: String(pullNumber),
      comment_id: String(commentId),
      comment_context: buildCommentContextInput({ artifact, liveComment, pullRequest }),
    },
  });

  core.info(`Dispatched ${reviewer.workflowId} for PR #${pullNumber} from comment ${commentId}.`);
};

module.exports = {
  REVIEWERS,
  dispatchReviewerCommand,
  parseReviewerCommand,
  routeReviewerCommand,
};
