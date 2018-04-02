import { ProcRunner } from './proc_runner';

/**
 *  Create a ProcRunner and pass it to an async function. When
 *  the async function finishes the ProcRunner is torn-down
 *  automatically
 *
 *  @param  {async Function} fn
 *  @return {Promise<undefined>}
 */
export async function withProcRunner(fn) {
  const procs = new ProcRunner();
  try {
    await fn(procs);
  } finally {
    await procs.teardown();
  }
}
