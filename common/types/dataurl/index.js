const Type = require('../type');
import { parse } from '../../lib/dataurl';

module.exports = new Type({
  name: 'dataurl',
  from: {
    null: () => '',
    string: (s) => `data:text/plain;base64,${Buffer.from(s, 'utf8').toString('base64')}`,
  },
  to: {
    string: (s) => {
      const props = parse(s, true);
      if (!props.mimetype !== 'text/plain') {
        throw new Error(`Can not convert mimetype to string: ${props.mimetype}`);
      }
      return Buffer.from(props.data, 'base64').toString('utf-8');
    },
    image: (s) => {
      const props = parse(s);
      if (!props || !props.mimetype.split('/')[0] !== 'image') {
        throw new Error(`Can not convert mimetype to image: ${props.mimetype}`);
      }
      return s;
    },
  },
});
