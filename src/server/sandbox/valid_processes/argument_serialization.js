export function serializeArgument(validProcesses) {
  return validProcesses.map(proc => `${proc.filename}:${proc.md5}`).join(',');
}

export function deserializeArgument(arg) {
  return arg.split(',').map(proc => {
    const [ filename, md5 ] = proc.split(':');
    return {
      filename,
      md5
    };
  });
}