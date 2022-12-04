import {CachedContentItem} from "./cached_content_item";
import type {ContentRegistry} from "../registry/content_registry";

export class ContentCache {
  protected readonly cache: Map<string, CachedContentItem> = new Map();

  constructor(public readonly registry: ContentRegistry) {}

  public get(id: string) {
    let item = this.cache.get(id);
    if (!item) {
      item = new CachedContentItem(id, this);
      this.cache.set(id, item);
    }
    item.refresh();
    return item;
  }
}
