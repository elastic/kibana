import repl from 'repl';
import util from 'util';

const PRINT_DEPTH = 5;

/**
 * Starts an interactive REPL with a global `server` object.
 *
 * @param {KibanaServer} kbnServer
 */
export function startRepl(kbnServer) {
  const replServer = repl.start({
    prompt: 'Kibana> ',
    useColors: true,
    writer: promiseFriendlyWriter({
      displayPrompt: () => replServer.displayPrompt(),
      getPrintDepth: () => replServer.context.repl.printDepth,
    }),
  });

  const initializeContext = () => {
    replServer.context.kbnServer = kbnServer;
    replServer.context.server = kbnServer.server;
    replServer.context.repl = {
      printDepth: PRINT_DEPTH,
      print(obj, depth = null) {
        console.log(promisePrint(obj, () => replServer.displayPrompt(), () => depth));
        return '';
      },
    };
  };

  initializeContext();
  replServer.on('reset', initializeContext);

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
function promiseFriendlyWriter({ displayPrompt, getPrintDepth }) {
  return (result) => promisePrint(result, displayPrompt, getPrintDepth);
}

function promisePrint(result, displayPrompt, getPrintDepth) {
  if (result && typeof result.then === 'function') {
    // Bit of a hack to encourage the user to wait for the result of a promise
    // by printing text out beside the current prompt.
    Promise.resolve()
      .then(() => console.log('Waiting for promise...'))
      .then(() => result)
      .then((o) => prettyPrint('Promise Resolved: \n', o, getPrintDepth()))
      .catch((err) => prettyPrint('Promise Rejected: \n', err, getPrintDepth()))
      .then(displayPrompt);
    return '';
  }
  return colorize(result, getPrintDepth());
}
