import React from 'react';

const ExpressionArgInput = (props = {}) => {
  return (
    <div className="canvas__argtype--expression">
      <div>expression args:</div>
      <div>
        <pre>{ JSON.stringify(props, null, 2) }</pre>
      </div>
    </div>
  );
};

export const expression = () => ({
  name: 'expression',
  displayName: 'Expression',
  help: 'Manually enter a custom expression',
  args: [],
  ExpressionArgInput,
});
