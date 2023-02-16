import { v4 as uuidv4 } from 'uuid';
import { TransactionFormState } from '../components/modal/transaction-form';
import { SpanFormState } from '../components/modal/span-form';
import { Transaction, Span, Service } from '../typings';
import { ServiceFormState } from '../components/modal/service-form';

export const generateTransactionPayload = (
  payload: TransactionFormState,
  serviceId: string = '',
  id?: string
): Transaction => ({
  docType: payload.type,
  name: payload.name,
  repeat: payload.repeat,
  serviceId,
  id: id || uuidv4(),
});

export const generateSpanPayload = (
  payload: SpanFormState,
  serviceId: string = '',
  id?: string
): Span => ({
  docType: payload.type,
  name: payload.name,
  type: payload.span_type,
  subtype: payload.sub_type,
  repeat: payload.repeat,
  serviceId,
  id: id || uuidv4(),
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

export const insertNodeInATree = (
  parentId: string,
  node: Transaction | Span,
  tree: Transaction | Span
): Transaction | Span => {
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

export const findNodeInATree = (
  id: string,
  tree?: Transaction | Span
): Transaction | Span | null => {
  if (!id || !tree) {
    return null;
  }
  if (tree.id === id) {
    return tree as Transaction;
  } else {
    let i;
    let result = null;
    if (tree.children) {
      for (i = 0; result === null && i < tree.children?.length; i++) {
        result = findNodeInATree(id, tree.children[i]);
      }
    }
    return result;
  }
};

// Since the tree is not flattened, we need to find the node in the tree
// and then update it. In next version we will flatten the tree and then
// we can use the index to update the node.
export const editNodeInATree = (
  id: string,
  node: Transaction | Span,
  tree?: Transaction
): Transaction => {
  // Due to Kibana dependency, we need to use Typescript "4.6.3".
  // With TS 4.7, structuredClone is available and we can use it to clone the tree.
  const clonedTree = JSON.parse(JSON.stringify(tree));
  let currentNode = findNodeInATree(id, clonedTree);
  Object.assign(currentNode, node);

  return clonedTree;
};

// Function generates only Light colors with HSL - hsl(hue, saturation, lightness).
export const colorCodeGenerator = () => {
  return 'hsl(' + Math.random() * 360 + ', 100%, 75%)';
};
