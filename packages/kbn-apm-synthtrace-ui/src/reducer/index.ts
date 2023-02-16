import { SynthtraceScenario } from '../typings';
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
      const transactionId = uuidv4();
      return {
        ...state,
        topLevelService: {
          name: `synth-${action.payload.agentName}`,
          agentName: action.payload.agentName,
          id,
        },
        services: {
          [id]: {
            agentName: action.payload.agentName,
            name: `synth-${action.payload.agentName}`,
            id,
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
      let clonedRoot = Object.assign({}, state.entryTransaction);
      const updatedTree = insertNodeInATree(action.payload.id, action.payload.node, clonedRoot);

      return {
        ...state,
        createModal: {
          isOpen: false,
          type: 'transaction',
          serviceId: '',
          id: '',
        },
        //@ts-ignore
        entryTransaction: updatedTree,
      };
    }
  }
}
