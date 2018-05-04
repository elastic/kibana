import React from 'react';
import PropTypes from 'prop-types';
import { FormControl } from 'react-bootstrap';
import { map, includes, sortBy } from 'lodash';
import lowerCase from 'lodash.lowercase';
import { MediaCard } from '../../media_card';
import './element_types.less';

export const ElementTypes = ({ elements, onClick, search, setSearch }) => {
  search = lowerCase(search);
  elements = sortBy(map(elements, (element, name) => ({ name, ...element })), 'displayName');
  const elementList = map(elements, (element, name) => {
    const { help, image, displayName, expression, filter } = element;
    const whenClicked = () => onClick({ expression, filter });
    const card = (
      <MediaCard key={name} image={image} title={displayName} onClick={whenClicked}>
        {help}
      </MediaCard>
    );

    if (!search) return card;
    if (includes(lowerCase(name), search)) return card;
    if (includes(lowerCase(displayName), search)) return card;
    if (includes(lowerCase(help), search)) return card;
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
      <div>{elementList}</div>
    </div>
  );
};

ElementTypes.propTypes = {
  elements: PropTypes.object,
  onClick: PropTypes.func,
  search: PropTypes.string,
  setSearch: PropTypes.func,
};
