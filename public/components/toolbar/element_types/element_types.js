import React from 'react';
import PropTypes from 'prop-types';
import { EuiFieldText } from '@elastic/eui';
import { map, includes, sortBy } from 'lodash';
import lowerCase from 'lodash.lowercase';
import { MediaCard } from '../../media_card';

export const ElementTypes = ({ elements, onClick, search, setSearch }) => {
  search = lowerCase(search);
  elements = sortBy(map(elements, (element, name) => ({ name, ...element })), 'displayName');
  const elementList = map(elements, (element, name) => {
    const { help, image, displayName, expression, filter, width, height } = element;
    const whenClicked = () => onClick({ expression, filter, width, height });
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
      <EuiFieldText
        fullWidth
        placeholder="Filter Elements"
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
