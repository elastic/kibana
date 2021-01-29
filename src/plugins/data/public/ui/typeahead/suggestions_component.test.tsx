/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { mount, shallow } from 'enzyme';
import React from 'react';
import { QuerySuggestion, QuerySuggestionTypes } from '../../autocomplete';
import { SuggestionComponent } from './suggestion_component';
import SuggestionsComponent from './suggestions_component';

const noop = () => {
  return;
};

const mockSuggestions: QuerySuggestion[] = [
  {
    description: 'This is not a helpful suggestion',
    end: 0,
    start: 42,
    text: 'as promised, not helpful',
    type: QuerySuggestionTypes.Value,
  },
  {
    description: 'This is another unhelpful suggestion',
    end: 0,
    start: 42,
    text: 'yep',
    type: QuerySuggestionTypes.Field,
  },
];

describe('SuggestionsComponent', () => {
  it('Should not display anything if the show prop is false', () => {
    const component = shallow(
      <SuggestionsComponent
        index={0}
        onClick={noop}
        onMouseEnter={noop}
        show={false}
        suggestions={mockSuggestions}
        loadMore={noop}
        queryBarRect={{ top: 0 } as DOMRect}
      />
    );

    expect(component.isEmptyRender()).toBe(true);
  });

  it('Should not display anything if there are no suggestions', () => {
    const component = shallow(
      <SuggestionsComponent
        index={0}
        onClick={noop}
        onMouseEnter={noop}
        show={true}
        suggestions={[]}
        loadMore={noop}
        queryBarRect={{ top: 0 } as DOMRect}
      />
    );

    expect(component.isEmptyRender()).toBe(true);
  });

  it('Should display given suggestions if the show prop is true', () => {
    const component = shallow(
      <SuggestionsComponent
        index={0}
        onClick={noop}
        onMouseEnter={noop}
        show={true}
        suggestions={mockSuggestions}
        loadMore={noop}
        queryBarRect={{ top: 0 } as DOMRect}
      />
    );

    expect(component.isEmptyRender()).toBe(false);
    expect(component).toMatchSnapshot();
  });

  it('Passing the index should control which suggestion is selected', () => {
    const component = shallow(
      <SuggestionsComponent
        index={1}
        onClick={noop}
        onMouseEnter={noop}
        show={true}
        suggestions={mockSuggestions}
        loadMore={noop}
        queryBarRect={{ top: 0 } as DOMRect}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('Should call onClick with the selected suggestion when it is clicked', () => {
    const mockCallback = jest.fn();
    const component = mount(
      <SuggestionsComponent
        index={0}
        onClick={mockCallback}
        onMouseEnter={noop}
        show={true}
        suggestions={mockSuggestions}
        loadMore={noop}
        queryBarRect={{ top: 0 } as DOMRect}
      />
    );

    component.find(SuggestionComponent).at(1).simulate('click');
    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith(mockSuggestions[1]);
  });

  it('Should call onMouseEnter with the index of the suggestion that was entered', () => {
    const mockCallback = jest.fn();
    const component = mount(
      <SuggestionsComponent
        index={0}
        onClick={noop}
        onMouseEnter={mockCallback}
        show={true}
        suggestions={mockSuggestions}
        loadMore={noop}
        queryBarRect={{ top: 0 } as DOMRect}
      />
    );

    component.find(SuggestionComponent).at(1).simulate('mouseenter');
    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith(1);
  });
});
