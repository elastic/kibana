/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mount, shallow } from 'enzyme';
import React from 'react';
import { QuerySuggestion, QuerySuggestionTypes } from '../index';
import { SuggestionComponent } from './suggestion_component';

const noop = () => {
  return;
};

const mockSuggestion: QuerySuggestion = {
  description: 'This is not a helpful suggestion',
  end: 0,
  start: 42,
  text: 'as promised, not helpful',
  type: QuerySuggestionTypes.Value,
};

describe('SuggestionComponent', () => {
  it('Should display the suggestion and use the provided ariaId', () => {
    const component = shallow(
      <SuggestionComponent
        index={0}
        onClick={noop}
        onMouseEnter={noop}
        selected={false}
        suggestion={mockSuggestion}
        innerRef={noop}
        ariaId={'suggestion-1'}
        shouldDisplayDescription={true}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('Should make the element active if the selected prop is true', () => {
    const component = shallow(
      <SuggestionComponent
        index={0}
        onClick={noop}
        onMouseEnter={noop}
        selected={true}
        suggestion={mockSuggestion}
        innerRef={noop}
        ariaId={'suggestion-1'}
        shouldDisplayDescription={true}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('Should call innerRef with a reference to the root div element', () => {
    const innerRefCallback = (index: number, ref: HTMLDivElement) => {
      expect(ref.className).toBe('kbnTypeahead__item');
      expect(ref.id).toBe('suggestion-1');
      expect(index).toBe(0);
    };

    mount(
      <SuggestionComponent
        index={0}
        onClick={noop}
        onMouseEnter={noop}
        selected={false}
        suggestion={mockSuggestion}
        innerRef={innerRefCallback}
        ariaId={'suggestion-1'}
        shouldDisplayDescription={true}
      />
    );
  });

  it('Should call onClick with the provided suggestion', () => {
    const mockHandler = jest.fn();

    const component = shallow(
      <SuggestionComponent
        index={0}
        onClick={mockHandler}
        onMouseEnter={noop}
        selected={false}
        suggestion={mockSuggestion}
        innerRef={noop}
        ariaId={'suggestion-1'}
        shouldDisplayDescription={true}
      />
    );

    component.simulate('click');
    expect(mockHandler).toHaveBeenCalledTimes(1);
    expect(mockHandler).toHaveBeenCalledWith(mockSuggestion, 0);
  });

  it('Should call onMouseEnter when user mouses over the element', () => {
    const mockHandler = jest.fn();

    const component = shallow(
      <SuggestionComponent
        index={0}
        onClick={noop}
        onMouseEnter={mockHandler}
        selected={false}
        suggestion={mockSuggestion}
        innerRef={noop}
        ariaId={'suggestion-1'}
        shouldDisplayDescription={true}
      />
    );

    component.simulate('mouseenter');
    expect(mockHandler).toHaveBeenCalledTimes(1);
  });
});
