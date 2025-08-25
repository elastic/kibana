export type NodeType = 'if' | 'merge' | 'parallel' | 'action' | 'foreach' | 'atomic' | 'trigger';

export const openScopeNodes = [
  'enter-if',
  'enter-foreach',
  'enter-condition-branch',
  'enter-retry',
];
export const closeScopeNodes = ['exit-if', 'exit-foreach', 'exit-condition-branch', 'exit-retry'];

export const mainScopeNodes = [
  'enter-if',
  'exit-if',
  'enter-foreach',
  'exit-foreach',
  'enter-retry',
  'exit-retry',
];
export const secondaryScopeNodes = ['enter-condition-branch', 'exit-condition-branch'];
export const atomicNodes = ['atomic'];
