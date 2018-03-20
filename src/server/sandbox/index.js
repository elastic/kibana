import sandbox from 'sandbox';

export async function activateSandbox() {
  // Darwin doesn't support system call filtering/sandboxing so we don't do anything here
  if (process.platform === 'darwin') {
    return;
  }

  const result = sandbox.activate();
  if (!result.success) {
    throw new Error(`Unable to activate the sandbox. ${result.message}`);
  }
}
