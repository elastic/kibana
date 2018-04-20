export function createPlatform(name) {
  return new class Platform {
    getName() {
      return name;
    }

    getNodeArch() {
      return `${name}-x64`;
    }

    getBuildName() {
      return `${name}-x86_64`;
    }

    isWindows() {
      return name === 'windows';
    }

    isMac() {
      return name === 'darwin';
    }

    isLinux() {
      return name === 'linux';
    }
  };
}
