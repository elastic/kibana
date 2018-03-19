import repl from 'repl';
import util from 'util';

// Used to ensure only one REPL instance is created.
let _replServer;

/**
 * Starts an interactive REPL with a global `server` object.
 *
 * @param {KibanaServer} server
 */
export function startRepl(server) {
  if (_replServer) {
    _replServer.context.server = server;
    return;
  }

  _replServer = repl.start({
    prompt: 'Kibana> ',
    useColors: true,
    writer: promiseFriendlyWriter(() => _replServer.displayPrompt()),
  });

  _replServer.context.server = server;
}

function colorize(o) {
  return util.inspect(o, { colors: true, depth: null });
}

function prettyPrint(text, o) {
  console.log(text, colorize(o));
}

// This lets us handle promises more gracefully than the default REPL,
// which doesn't show the results.
function promiseFriendlyWriter(displayPrompt) {
  return (result) => {
    if (result && typeof result.then === 'function') {
      result
        .then((o) => prettyPrint('Promise Resolved: \n', o))
        .catch((err) => prettyPrint('Promise Rejected: \n', err))
        .then(displayPrompt);
      // Bit of a hack to encourage the user to wait for the result of a promise
      // by printing text out beside the current prompt.
      setTimeout(() => console.log('Waiting for promise...'), 1);
      return '';
    }
    return colorize(result);
  };
}
