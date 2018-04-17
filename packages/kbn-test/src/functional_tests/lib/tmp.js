import tmp from 'tmp';

export async function withTmpDir(fn) {
  const { name: tmpDir, removeCallback: removeTmpDir } = tmp.dirSync({ unsafeCleanup: true });
  try {
    await fn(tmpDir);
  } finally {
    await removeTmpDir();
  }
}
