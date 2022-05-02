import * as vm from 'vm';
import { buildDefaultAppContext } from './custom_require';

export class ProxiedPlugin {
    constructor(
      private readonly plugin: any,
      private readonly customRequire: (mod: string) => {}) {}

    public hasMethod(method: string): boolean {
        return typeof (this.plugin as any)[method] === 'function';
    }

    public makeContext(data: object): vm.Context {
        return buildDefaultAppContext(Object.assign({}, {
            require: this.customRequire,
        }, data));
    }

    public runInContext(codeToRun: string, context: vm.Context): any {
        return vm.runInContext(codeToRun, context, {
            timeout: 1000,
            filename: `kibana_console_plg.ts`,
        });
    }

    public async call(method: string, ...args: Array<any>): Promise<any> {
        if (typeof (this.plugin as any)[method] !== 'function') {
            throw new Error(`The App ${this.plugin.getName()} (${this.plugin.getID()}`
                + ` does not have the method: "${method}"`);
        }

        console.debug(`${method} is being called...`);

        let result;
        try {
            // tslint:disable-next-line:max-line-length
            result = await this.runInContext(`app.${method}.apply(app, args)`, this.makeContext({ app: this.plugin, args })) as Promise<any>;
            console.debug(`'${method}' was successfully called! The result is:`, result);
        } catch (e) {
            console.error(e);
            console.debug(`'${method}' was unsuccessful.`);
            throw e;
        } finally {
            // this.manager.getLogStorage().storeEntries(this.getID(), logger);
        }

        return result;
    }
}