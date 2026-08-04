import React from 'react';
import type { AggregateQuery, Query } from '@kbn/es-query';
import type { SearchBarProps } from './search_bar';
export declare const SearchBar: <QT extends AggregateQuery | Query = Query>(props: Omit<SearchBarProps<QT>, "intl" | "kibana">) => React.JSX.Element;
export type { StatefulSearchBarProps } from './create_search_bar';
export type { SearchBarProps, SearchBarOwnProps } from './search_bar';
