import { Service, SynthtraceScenario, Transaction } from '../typings';
import { Action } from './actions';
import { v4 as uuidv4 } from 'uuid';
import { insertNodeInATree } from '../common/helpers';

export const INITIAL_STATE: SynthtraceScenario = {
  instanceName: 'instance_1',
  environment: 'production',
  isDistributedTracing: false,
  createModal: {
    isOpen: false,
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
      return {
        ...state,
        service: {
          agentName: action.payload.agentName,
          name: `synth-${action.payload.agentName}`,
          children: [{ name: 'tx1', serviceId: id, id: uuidv4(), children: [] } as Transaction],
          id,
        },
      };
    }
    case 'toggle_create_modal': {
      return {
        ...state,
        createModal: {
          isOpen: action.payload.isOpen,
          type: action.payload.type,
          serviceId: action.payload.serviceId,
          id: action.payload.id,
        },
      };
    }
    case 'insert_node': {
      let clonedRoot = Object.assign({}, state.service);
      const updatedTree = insertNodeInATree(action.payload.id, action.payload.node, clonedRoot);

      return {
        ...state,
        createModal: {
          isOpen: false,
          type: 'transaction',
          serviceId: '',
          id: '',
        },
        service: updatedTree as Service,
      };
    }
  }
}
