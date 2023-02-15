import { v4 as uuidv4 } from 'uuid';
import { TransactionFormState } from '../components/modal/transaction-form';
import { SpanFormState } from '../components/modal/span-form';
import { Service, Transaction, Span } from '../typings';

export const createTransactionPayload = (
  payload: TransactionFormState,
  serviceId: string = ''
): Transaction => ({
  name: payload.name,
  repeat: payload.repeat,
  serviceId,
  id: uuidv4(),
  children: [],
});

export const createSpanPayload = (payload: SpanFormState, serviceId: string = ''): Span => ({
  name: payload.name,
  type: payload.span_type,
  subtype: payload.sub_type,
  repeat: payload.repeat,
  serviceId,
  id: uuidv4(),
  children: [],
});

// Function to insert a node in a tree
export const insertNodeInATree = (
  parentId: string,
  node: Service | Transaction | Span,
  tree: Service | Transaction | Span
): Service | Transaction | Span => {
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
