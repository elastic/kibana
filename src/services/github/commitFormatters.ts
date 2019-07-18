import { CommitChoice, CommitSelected } from './Commit';

export function getHumanReadableReference(commit: CommitSelected) {
  return commit.pullNumber ? `#${commit.pullNumber}` : getShortSha(commit.sha);
}

export function getShortSha(sha: string) {
  return sha.slice(0, 8);
}

export function getFirstCommitMessageLine(message: string) {
  return message.split('\n')[0].replace(/\s\(#\d+\)/g, '');
}

export function withFormattedCommitMessage<
  T extends CommitSelected | CommitChoice
>(commit: T): T {
  const firstMessageLine = getFirstCommitMessageLine(commit.message);
  return {
    ...commit,
    message: `${firstMessageLine} (${getHumanReadableReference(commit)})`
  };
}
