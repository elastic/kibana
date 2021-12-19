export function getShortSha(sha: string) {
  return sha.slice(0, 8);
}

export function getFirstLine(message: string) {
  return message.split('\n')[0];
}

export function stripPullNumber(message: string) {
  const firstMessageLine = getFirstLine(message);
  const messageWithoutPullNumber = firstMessageLine.replace(/( \(#\d+\))$/, '');
  return messageWithoutPullNumber;
}

export function extractPullNumber(firstMessageLine: string) {
  const matches = firstMessageLine.match(/\(#(\d+)\)/);
  if (matches) {
    return parseInt(matches[1], 10);
  }
}
