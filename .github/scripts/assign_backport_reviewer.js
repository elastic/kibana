const normalize = (value) => value.replace(/^@/, '').trim();

const isHumanReviewer = (login) =>
  Boolean(login) && login !== 'kibanamachine' && !login.endsWith('[bot]');

const getOriginalPrNumber = ({ title, body }) => {
  const sourcePullRequestIndex = body.indexOf('"sourcePullRequest"');
  const originalPrNumberFromMetadata =
    sourcePullRequestIndex === -1
      ? undefined
      : body
          .slice(sourcePullRequestIndex)
          .match(/"number"\s*:\s*(\d+)/)?.[1];
  const originalPrNumberFromTitle = title.match(/\(#(\d+)\)\s*$/)?.[1];

  return Number(originalPrNumberFromMetadata ?? originalPrNumberFromTitle);
};

const getReviews = async ({ github, owner, repo, originalPrNumber }) => {
  const reviewHistory = await github.graphql(
    `query($owner: String!, $repo: String!, $number: Int!) {
      repository(owner: $owner, name: $repo) {
        pullRequest(number: $number) {
          reviews(first: 100) {
            nodes {
              state
              submittedAt
              author {
                login
              }
              onBehalfOf(first: 10) {
                nodes {
                  slug
                  organization {
                    login
                  }
                }
              }
            }
          }
        }
      }
    }`,
    {
      owner,
      repo,
      number: originalPrNumber,
    }
  );

  return (reviewHistory.repository.pullRequest?.reviews?.nodes ?? [])
    .filter((review) => Boolean(review.submittedAt))
    .sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt));
};

const getReviewedTeams = (reviews) => {
  const reviewedTeams = [];

  for (const review of reviews) {
    for (const team of review.onBehalfOf.nodes ?? []) {
      const combinedSlug = `${team.organization.login}/${team.slug}`;
      if (!reviewedTeams.includes(combinedSlug)) {
        reviewedTeams.push(combinedSlug);
      }
    }
  }

  return reviewedTeams;
};

const getMatchedTeams = async ({ github, core, prAuthor, reviewedTeams }) => {
  try {
    const result = await github.graphql(
      `query($login: String!) {
        organization(login: "elastic") {
          teams(first: 100, userLogins: [$login]) {
            nodes { combinedSlug }
          }
        }
      }`,
      { login: prAuthor }
    );
    const authorTeams = new Set(
      result.organization.teams.nodes.map((team) => normalize(team.combinedSlug))
    );

    return reviewedTeams.filter((team) => authorTeams.has(team));
  } catch (error) {
    core.warning(`Failed to query author's org teams: ${error.message}`);
    return [];
  }
};

const getFallbackReviewer = ({ reviews, prAuthor }) => {
  const fallbackReview = reviews.find((review) => {
    const login = review.author?.login;

    return (
      review.state === 'APPROVED' &&
      isHumanReviewer(login) &&
      login !== prAuthor &&
      Boolean(review.submittedAt)
    );
  });

  return fallbackReview?.author.login;
};

const requestReviewers = async ({ github, pullRequestId, teamReviewers, reviewer }) => {
  await github.graphql(
    `mutation RequestReviewsByLogin(
      $pullRequestId: ID!
      $userLogins: [String!]
      $teamSlugs: [String!]
    ) {
      requestReviewsByLogin(
        input: {
          pullRequestId: $pullRequestId
          userLogins: $userLogins
          teamSlugs: $teamSlugs
          union: false
        }
      ) {
        clientMutationId
      }
    }`,
    {
      pullRequestId,
      userLogins: reviewer ? [reviewer] : [],
      teamSlugs: teamReviewers,
    }
  );
};

module.exports = async ({ github, context, core }) => {
  const { owner, repo } = context.repo;
  const pullRequest = context.payload.pull_request;
  const prAuthor = pullRequest.user.login;
  const title = pullRequest.title ?? '';
  const body = pullRequest.body ?? '';
  const originalPrNumber = getOriginalPrNumber({ title, body });

  if (!Number.isInteger(originalPrNumber)) {
    core.info('No source pull request number found');
    return;
  }

  const reviews = await getReviews({ github, owner, repo, originalPrNumber });
  const reviewedTeams = getReviewedTeams(reviews);
  const teamReviewers = await getMatchedTeams({
    github,
    core,
    prAuthor,
    reviewedTeams,
  });
  const reviewer =
    teamReviewers.length > 0 ? undefined : getFallbackReviewer({ reviews, prAuthor });

  if (teamReviewers.length === 0 && !reviewer) {
    core.info('No team reviewers or fallback reviewer found');
    return;
  }

  core.info(`Updating reviewers: teamReviewers=${teamReviewers}, reviewer=${reviewer}`);

  await requestReviewers({
    github,
    pullRequestId: pullRequest.node_id,
    teamReviewers,
    reviewer,
  });
};
