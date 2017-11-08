export function stdin() {
  const stdin = process.stdin;
  let text = '';

  return new Promise(resolve => {
    stdin.setEncoding('utf8');

    stdin.on('readable', () => {
      let chunk;

      while ((chunk = stdin.read())) {
        text += chunk;
      }
    });

    stdin.on('end', () => {
      resolve(text);
    });
  });
}
