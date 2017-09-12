import React from 'react';
import PropTypes from 'prop-types';
import './element_types.less';
import { MediaCard } from '../../media_card';
import { map, includes, lowerCase } from 'lodash';
import { FormControl } from 'react-bootstrap';

export const ElementTypes = ({ elements, onClick, search, setSearch }) => {
  search = lowerCase(search);
  const elementList = map(elements, (val, name) => {
    const { expression, filter } = val;
    const whenClicked = () => onClick({ expression, filter });
    const { description, image, displayName } = val;
    const card = (
      <MediaCard key={name} image={image} title={displayName} onClick={whenClicked}>
        {description}
      </MediaCard>
    );

    if (!search) return card;
    if (includes(lowerCase(name), search)) return card;
    if (includes(lowerCase(displayName), search)) return card;
    if (includes(lowerCase(description), search)) return card;
    return null;
  });

  return (
    <div>
      <FormControl
        spellCheck={false}
        componentClass="input"
        placeholder="Filter Elements"
        type="text"
        onChange={e => setSearch(e.target.value)}
        value={search}
      />
      <div>
        {elementList}
      </div>
    </div>
  );
};

ElementTypes.propTypes = {
  elements: PropTypes.object,
  onClick: PropTypes.func,
  search: PropTypes.string,
  setSearch: PropTypes.func,
};
