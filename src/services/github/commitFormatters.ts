export function getShortSha(sha: string) {
  return sha.slice(0, 8);
}

export function getFirstCommitMessageLine(message: string) {
  return message.split('\n')[0];
}

export function getFormattedCommitMessage({
  message,
  pullNumber,
  sha
}: {
  message: string;
  pullNumber?: number;
  sha: string;
}) {
  const firstMessageLine = getFirstCommitMessageLine(message);
  if (pullNumber) {
    const messageHasPullNumber = firstMessageLine.includes(`#${pullNumber}`);

    // message already contain pull number
    if (messageHasPullNumber) {
      return firstMessageLine;
    }

    // message doesn't contain pull number. Add it
    return `${firstMessageLine} (#${pullNumber})`;
  }

  // pull number not available. Add commit
  return `${firstMessageLine} (${getShortSha(sha)})`;
}
