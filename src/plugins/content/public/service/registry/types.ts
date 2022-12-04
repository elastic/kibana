export interface ContentTypeDetails<T = unknown> {
  id: string;
  name?: string;
  description?: string;
  icon?: string;
  operations: ContentTypeOperations<T>;

}

export interface ContentTypeOperations<T = unknown> {
  read?: (id: string) => Promise<ContentItemDetails<T>>;
  list?: () => Promise<ContentItemDetails<T>[]>;
}

export interface ContentItemDetails<T = unknown> {
  id: string;
  fields: ContentItemFields;
  data: T;
}

export interface ContentItemFields {
  title?: string;
  description?: string;
}
