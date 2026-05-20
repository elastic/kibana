import type { AggregateQuery } from '@kbn/es-query';
import type { TopNavMenuProps } from '@kbn/navigation-plugin/public';
import type { ComponentType } from 'react';
export interface SearchBarCustomization {
    id: 'search_bar';
    CustomDataViewPicker?: ComponentType;
    PrependFilterBar?: ComponentType;
    CustomSearchBar?: ComponentType<TopNavMenuProps<AggregateQuery>>;
    hideDataViewPicker?: boolean;
}
