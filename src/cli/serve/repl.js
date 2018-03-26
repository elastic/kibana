import repl from 'repl';
import util from 'util';

/**
 * Starts an interactive REPL with a global `server` object.
 *
 * @param {KibanaServer} server
 */
export function startRepl(server) {
  const replServer = repl.start({
    prompt: 'Kibana> ',
    useColors: true,
    writer: promiseFriendlyWriter(() => replServer.displayPrompt()),
  });

  replServer.context.server = server;
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
      // Bit of a hack to encourage the user to wait for the result of a promise
      // by printing text out beside the current prompt.
      Promise.resolve()
        .then(() => console.log('Waiting for promise...'))
        .then(() => result)
        .then((o) => prettyPrint('Promise Resolved: \n', o))
        .catch((err) => prettyPrint('Promise Rejected: \n', err))
        .then(displayPrompt);
      return '';
    }
    return colorize(result);
  };
}
