import type { GetIn, CreateIn, UpdateIn, DeleteIn, SearchIn, MSearchIn } from '../../common';
export interface CrudClient {
    get(input: GetIn): Promise<unknown>;
    create(input: CreateIn): Promise<unknown>;
    update(input: UpdateIn): Promise<unknown>;
    delete(input: DeleteIn): Promise<unknown>;
    search(input: SearchIn): Promise<unknown>;
    mSearch?(input: MSearchIn): Promise<unknown>;
}
