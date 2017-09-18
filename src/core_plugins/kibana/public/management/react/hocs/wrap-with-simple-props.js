import React, { PropTypes, cloneElement } from 'react';
import { mapValues, get } from 'lodash';

const SimplePropsWrap = ({
  children,
  statePath,
  action,
  wrappedProps,
  actions,
  ...rest,
}) => {
  const stateData = get(rest, statePath);
  const connectedActions = mapValues(actions, _action => {
    return (...args) => action(statePath, _action(wrappedProps, ...args));
  });

  return cloneElement(children, {
    ...rest,
    ...stateData,
    ...connectedActions,
  });
}

SimplePropsWrap.contextTypes = {
  store: PropTypes.object,
};

export const wrapWithSimpleProps = ({ props: wrappedProps, actions, statePath, action }) => {
  return (BaseComponent) => (props) => (
    <SimplePropsWrap
      statePath={statePath}
      action={action}
      wrappedProps={wrappedProps}
      actions={actions}
      {...props}
    >
      <BaseComponent/>
    </SimplePropsWrap>
  );
};
