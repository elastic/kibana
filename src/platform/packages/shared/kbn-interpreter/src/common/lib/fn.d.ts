export function Fn(config: any): void;
export class Fn {
    constructor(config: any);
    name: any;
    type: any;
    aliases: any;
    fn: (...args: any[]) => Promise<any>;
    help: any;
    args: {
        [x: string]: Arg;
    };
    context: any;
    accepts: (type: any) => boolean;
}
import type { Arg } from './arg';
