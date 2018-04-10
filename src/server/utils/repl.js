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
  replServer.context.repl = {
    print(obj, depth = null) {
      console.log(promisePrint(obj, () => replServer.displayPrompt(), depth));
      return '';
    },
  };

  return replServer;
}

function colorize(o, depth) {
  return util.inspect(o, { colors: true, depth });
}

function prettyPrint(text, o, depth) {
  console.log(text, colorize(o, depth));
}

// This lets us handle promises more gracefully than the default REPL,
// which doesn't show the results.
function promiseFriendlyWriter(displayPrompt) {
  const PRINT_DEPTH = 15;
  return (result) => promisePrint(result, displayPrompt, PRINT_DEPTH);
}

function promisePrint(result, displayPrompt, depth) {
  if (result && typeof result.then === 'function') {
    // Bit of a hack to encourage the user to wait for the result of a promise
    // by printing text out beside the current prompt.
    Promise.resolve()
      .then(() => console.log('Waiting for promise...'))
      .then(() => result)
      .then((o) => prettyPrint('Promise Resolved: \n', o, depth))
      .catch((err) => prettyPrint('Promise Rejected: \n', err, depth))
      .then(displayPrompt);
    return '';
  }
  return colorize(result, depth);
}
