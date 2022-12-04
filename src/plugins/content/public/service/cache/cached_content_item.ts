import {firstValueFrom, ReplaySubject} from "rxjs";
import type {ContentItem} from "../registry/content_item";
import type {ContentRegistry} from "../registry/content_registry";

export class CachedContentItem<T = unknown> {
  public readonly data = new ReplaySubject<ContentItem<T>>(1);

  constructor(public readonly id: string, protected readonly registry: ContentRegistry) {}

  public get type(): string {
    return this.id.split(':')[0];
  }

  public get itemId(): string {
    return this.id.split(':')[1];
  }

  public async load(): Promise<void> {
    const type = this.registry.getType(this.type);
    if (!type) throw new Error(`Unknown content type: ${this.type}`);
    const item = await type.read(this.itemId) as ContentItem<T>;
    this.data.next(item);
  }

  public refresh(): void {
    this.load().catch(() => {});
  }

  public async getData(): Promise<ContentItem<T>> {
    return firstValueFrom(this.data);
  }
}
