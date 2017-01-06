import React from 'react';
import Counter from './counter';

export default React.createClass({
  render() {
    return (
      <div className='react--main'>
        <p>
          There are only 2 components in this app. This paragraph is part of the <code>rootComponent</code> you'll see
          in <code>public/app.js</code>, which imports <code>public/components/app.js</code>.
          The big grey box below is the <code>Counter</code> component, found in <code>public/components/app.js</code>.
          It is the only component that modifies state.
        </p>

        <Counter></Counter>
      </div>
    );
  }
});
