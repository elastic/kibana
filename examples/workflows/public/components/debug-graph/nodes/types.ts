export type NodeType = 'if' | 'merge' | 'parallel' | 'action' | 'foreach' | 'atomic' | 'trigger';

export const openScopeNodes = [
  'enter-if',
  'enter-foreach',
  'enter-condition-branch',
  'enter-retry',
  'enter-continue',
  'enter-try-block',
  'enter-normal-path',
  'enter-fallback-path',
];
export const closeScopeNodes = [
  'exit-if',
  'exit-foreach',
  'exit-condition-branch',
  'exit-retry',
  'exit-continue',
  'exit-try-block',
  'exit-normal-path',
  'exit-fallback-path',
];

export const mainScopeNodes = [
  'enter-if',
  'exit-if',
  'enter-foreach',
  'exit-foreach',
  'enter-retry',
  'exit-retry',
  'enter-continue',
  'exit-continue',
  'enter-try-block',
  'exit-try-block',
];
export const secondaryScopeNodes = [
  'enter-condition-branch',
  'exit-condition-branch',
  'enter-normal-path',
  'exit-normal-path',
  'enter-fallback-path',
  'exit-fallback-path',
];
export const atomicNodes = ['atomic'];
