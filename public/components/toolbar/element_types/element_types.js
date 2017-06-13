import React from 'react';
import PropTypes from 'prop-types';
import './element_types.less';
import { Button, ButtonToolbar } from 'react-bootstrap';
import { map } from 'lodash';

export const ElementTypes = ({ elements, onClick }) => {
  const elementList = map(elements, (val, name) => {
    const whenClicked = () => onClick(name);
    return (<Button key={name} onClick={whenClicked}>{name}</Button>);
  });

  return (
    <ButtonToolbar>
      {elementList}
    </ButtonToolbar>
  );
};

ElementTypes.propTypes = {
  elements: PropTypes.object,
  onClick: PropTypes.func,
};
