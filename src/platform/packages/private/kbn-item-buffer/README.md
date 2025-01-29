# @kbn/item-buffer

`ItemBuffer`: A simple buffer that collects items. Can be cleared or flushed; and can automatically flush when specified number of items is reached.
`TimedItemBuffer`: An `ItemBuffer` that flushes buffer when oldest item reaches age specified by this parameter, in milliseconds.
