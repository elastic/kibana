export function parseValidProcesses(argv) {
  if (argv.length <= 1) {
    return [];
  }

  const arg = argv[2];
  return arg.split(',').map(proc => {
    const [ filename, md5 ] = proc.split(':');
    return {
      filename,
      md5
    };
  });
}