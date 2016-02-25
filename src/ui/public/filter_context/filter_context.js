import RootSearchSourceProvider from 'ui/courier/data_source/_root_search_source';

export default function FilterContextProvider(Private) {
  const rootSearchSource = Private(RootSearchSourceProvider);

  return {
    getEsBoolQuery() {
      const searchSource = rootSearchSource.get();
      return searchSource._flatten().then(({ body: { query: { bool } } }) => ({ bool }));
    }
  };
}
