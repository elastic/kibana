import { CANVAS_TYPE } from '../common/lib/constants';

export const mappings = {
  [CANVAS_TYPE]: {
    dynamic: false,
    properties: {
      name: {
        type: 'text',
        fields: {
          keyword: {
            type: 'keyword',
          },
        },
      },
      id: { type: 'text', index: false },
      '@timestamp': { type: 'date' },
      '@created': { type: 'date' },
    },
  },
};
