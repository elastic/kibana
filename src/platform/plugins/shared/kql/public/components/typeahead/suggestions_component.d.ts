/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import { PureComponent } from 'react';
import type { QuerySuggestion } from '../../autocomplete';
import type { SuggestionOnClick, SuggestionOnMouseEnter } from './types';
interface SuggestionsComponentProps {
  index: number | null;
  onClick: SuggestionOnClick;
  onMouseEnter: SuggestionOnMouseEnter;
  show: boolean;
  suggestions: QuerySuggestion[];
  loadMore: () => void;
  size?: SuggestionsListSize;
  inputContainer: HTMLElement | null;
}
export interface SuggestionsAbstraction {
  type: 'alerts' | 'rules' | 'cases' | 'endpoints' | 'action_policies';
  fields: Record<
    string,
    {
      field: string;
      fieldToQuery: string;
      displayField: string | undefined;
      nestedDisplayField?: string;
      nestedField?: string;
      nestedPath?: string;
    }
  >;
}
export type SuggestionsListSize = 's' | 'l';
export declare class SuggestionsComponent extends PureComponent<SuggestionsComponentProps> {
  private childNodes;
  private parentNode;
  constructor(props: SuggestionsComponentProps);
  private assignParentNode;
  private assignChildNode;
  render(): React.JSX.Element | null;
  componentDidUpdate(prevProps: SuggestionsComponentProps): void;
  private scrollIntoView;
  private handleScroll;
}
export {};
