export function isOSS() {
  try {
    require.resolve('x-pack/package.json');
    return false;
  } catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') {
      throw error;
    }

    return true;
  }
}
