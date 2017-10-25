import { parse } from '../../lib/dataurl';

export const dataurl = {
  name: 'dataurl',
  from: {
    null: () => '',
    string: (s) => `data:text/plain;base64,${Buffer.from(s, 'utf8').toString('base64')}`,
  },
  to: {
    string: (dataurl) => {
      const props = parse(dataurl.value, true);
      if (props.mimetype === 'text/plain') return Buffer.from(props.data, 'base64').toString('utf-8');
      return dataurl.value;
    },
    image: (dataurl) => {
      const props = parse(dataurl.value);
      if (!props || !props.isImage) {
        throw new Error(`Can not convert mimetype to image: ${props.mimetype}`);
      }
      return dataurl.value;
    },
  },
};
