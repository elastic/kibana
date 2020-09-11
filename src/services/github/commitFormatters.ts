export function getShortSha(sha: string) {
  return sha.slice(0, 8);
}

export function getFirstCommitMessageLine(message: string) {
  return message.split('\n')[0];
}

export function getFormattedCommitMessage({
  message,
  pullNumber,
  sha,
}: {
  message: string;
  pullNumber?: number;
  sha: string;
}) {
  const firstMessageLine = getFirstCommitMessageLine(message);
  const messageHasPullNumber = firstMessageLine.match(/.+ \(#\d+\)/);

  // message already contains pull number
  if (messageHasPullNumber) {
    return firstMessageLine;
  }

  // message doesn't contain pull number. Add it
  if (pullNumber) {
    return `${firstMessageLine} (#${pullNumber})`;
  }

  // pull number not available. Add commit
  return `${firstMessageLine} (${getShortSha(sha)})`;
}

export function getPullNumberFromMessage(firstMessageLine: string) {
  const matches = firstMessageLine.match(/\(#(\d+)\)/);
  if (matches) {
    return parseInt(matches[1], 10);
  }
}
