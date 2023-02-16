import { v4 as uuidv4 } from 'uuid';
import { TransactionFormState } from '../components/modal/transaction-form';
import { SpanFormState } from '../components/modal/span-form';
import { Transaction, Span, Service } from '../typings';
import { ServiceFormState } from '../components/modal/service-form';

export const createTransactionPayload = (
  payload: TransactionFormState,
  serviceId: string = ''
): Transaction => ({
  docType: payload.type,
  name: payload.name,
  repeat: payload.repeat,
  serviceId,
  id: uuidv4(),
  children: [],
});

export const createSpanPayload = (payload: SpanFormState, serviceId: string = ''): Span => ({
  docType: payload.type,
  name: payload.name,
  type: payload.span_type,
  subtype: payload.sub_type,
  repeat: payload.repeat,
  serviceId,
  id: uuidv4(),
  children: [],
});

export const createDummyTransactionForService = (serviceId: string): Transaction => ({
  docType: 'transaction',
  name: 'new transaction',
  repeat: 0,
  serviceId,
  id: uuidv4(),
  children: [],
});

export const createServicePayload = (
  payload: ServiceFormState,
  serviceId: string = ''
): Service => ({
  id: serviceId,
  name: payload.name,
  agentName: payload.agentName,
  color: colorCodeGenerator(),
});

// Function to insert a node in a tree
export const insertNodeInATree = (
  parentId: string,
  node: Transaction | Span,
  tree: Transaction | Span
): Transaction | Span => {
  // If the tree is empty, return a new tree
  if (tree === null) return tree;

  // Otherwise, recur down the tree
  if (tree.id === parentId) {
    tree.children = tree.children || [];
    tree.children.push(node);
  } else {
    tree.children?.forEach((child) => insertNodeInATree(parentId, node, child));
  }
  return tree;
};

// Function generates only Light colors with HSL - hsl(hue, saturation, lightness).
export const colorCodeGenerator = () => {
  return 'hsl(' + Math.random() * 360 + ', 100%, 75%)';
};
