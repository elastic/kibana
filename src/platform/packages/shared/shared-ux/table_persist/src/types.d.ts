export interface PropertySort<T> {
    field: keyof T;
    direction: 'asc' | 'desc';
}
export interface PersistData<T> {
    pageSize?: number;
    sort?: PropertySort<T>;
}
