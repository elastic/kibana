import React from 'react';
import PropTypes from 'prop-types';
import './element_types.less';
import { MediaCard } from '../../media_card';
import { map } from 'lodash';

export const ElementTypes = ({ elements, onClick }) => {
  const elementList = map(elements, (val, name) => {
    const whenClicked = () => onClick(val.expression);
    console.log(val);
    return (
      <MediaCard key={name} image={val.image} title={val.displayName} onClick={whenClicked}>
        {val.description}
      </MediaCard>
    );
  });

  return (
    <div>
      {elementList}
    </div>
  );
};

ElementTypes.propTypes = {
  elements: PropTypes.object,
  onClick: PropTypes.func,
};
