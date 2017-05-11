import React from 'react';
import { ArgType } from '../arg_type';

const template = (props = {}) => {
  return (
    <div>
      <div>expression args:</div>
      <div>
        <pre>{ JSON.stringify(props, null, 2) }</pre>
      </div>
    </div>
  );
};

export const expression = () => new ArgType('expression', {
  displayName: 'Expression',
  description: 'Manually enter a custom expression',
  args: [],
  template,
});
