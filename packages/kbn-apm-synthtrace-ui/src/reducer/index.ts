import { SynthtraceScenario, Transaction } from '../typings';
import { Action } from './actions';
import { v4 as uuidv4 } from 'uuid';
import { colorCodeGenerator, editNodeInATree, insertNodeInATree } from '../common/helpers';
import { generate } from 'marvel-dc-name-generator';

export const INITIAL_STATE: SynthtraceScenario = {
  instanceName: 'instance_1',
  environment: 'production',
  isDistributedTracing: true,
  modalForm: {
    isOpen: false,
    isEdit: false,
    type: 'transaction',
    serviceId: '',
    id: '',
  },
};

export function reducer(state: SynthtraceScenario, action: Action): SynthtraceScenario {
  switch (action.type) {
    case 'toggle_distributed_tracing': {
      return {
        ...state,
        isDistributedTracing: action.payload.isDistributedTracing,
      };
    }
    case 'change_top_level_service': {
      const id = uuidv4();
      const serviceColor = colorCodeGenerator();
      const name = generate();
      const transactionId = uuidv4();
      return {
        ...state,
        topLevelService: {
          name: `synth-${action.payload.agentName}-${name}`,
          agentName: action.payload.agentName,
          id,
          color: serviceColor,
        },
        services: {
          [id]: {
            agentName: action.payload.agentName,
            name: `synth-${action.payload.agentName}-${name}`,
            id,
            color: serviceColor,
          },
        },
        entryTransaction: {
          docType: 'transaction',
          id: transactionId,
          serviceId: id,
          name: '1rpm/1100ms',
          children: [],
        },
      };
    }
    case 'toggle_modal_form': {
      return {
        ...state,
        modalForm: {
          isOpen: action.payload.isOpen,
          isEdit: action.payload.isEdit,
          type: action.payload.type,
          serviceId: action.payload.serviceId,
          id: action.payload.id,
        },
      };
    }
    case 'insert_node': {
      let clonedRoot = Object.assign({}, state.entryTransaction);
      const updatedTree = insertNodeInATree(action.payload.id, action.payload.node, clonedRoot);

      return {
        ...state,
        modalForm: {
          ...state.modalForm,
          isOpen: false,
          type: 'transaction',
          serviceId: '',
          id: '',
        },
        entryTransaction: updatedTree as Transaction,
      };
    }
    case 'insert_service': {
      let clonedRoot = Object.assign({}, state.entryTransaction);
      const updatedTree = insertNodeInATree(action.payload.id, action.payload.node, clonedRoot);

      return {
        ...state,
        modalForm: {
          ...state.modalForm,
          isOpen: false,
          type: 'transaction',
          serviceId: '',
          id: '',
        },
        entryTransaction: updatedTree as Transaction,
        services: {
          ...state.services,
          [action.payload.service.id]: action.payload.service,
        },
      };
    }
    case 'edit_node': {
      const updatedTree = editNodeInATree(
        action.payload.id,
        action.payload.node,
        state.entryTransaction
      );

      return {
        ...state,
        modalForm: {
          isEdit: false,
          isOpen: false,
          type: 'transaction',
          serviceId: '',
          id: '',
        },
        entryTransaction: updatedTree as Transaction,
      };
    }
  }
}
