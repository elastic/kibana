var execFileSync = require('child_process').execFileSync;

module.exports = function gitInfo(rootPath) {
  try {
    var LOG_SEPARATOR = '||';
    var commitCount = execFileSync('git', ['rev-list', '--count', 'HEAD'], {
      cwd: rootPath,
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
    });
    var logLine = execFileSync('git', ['log', '--pretty=%h' + LOG_SEPARATOR + '%cD', '-n', '1'], {
      cwd: rootPath,
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
    }).split(LOG_SEPARATOR);

    return {
      count: commitCount.trim(),
      sha: logLine[0].trim(),
      date: logLine[1].trim(),
    };
  } catch (e) {
    return {};
  }
};