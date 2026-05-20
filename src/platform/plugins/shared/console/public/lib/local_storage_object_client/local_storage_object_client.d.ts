import type { ObjectStorage, IdObject } from '../../../common/types';
import type { Storage } from '../../services';
export declare class LocalObjectStorage<O extends IdObject> implements ObjectStorage<O> {
    private readonly client;
    private readonly prefix;
    constructor(client: Storage, type: string);
    create(obj: Omit<O, 'id'>): Promise<O>;
    update(obj: O): Promise<void>;
    findAll(): Promise<O[]>;
}
