/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Generators
 *
 * The Effect.gen utility simplifies the task of writing effectful
 * code by utilizing JavaScript’s generator functions.
 * This method helps your code appear and behave more like traditional
 * synchronous code, which enhances both readability and error management.
 *
 * Pipelines
 *
 * Pipelines are an excellent way to structure your application and handle
 * data transformations in a concise and modular manner.
 * They offer several benefits:
 *
 * Readability: Pipelines allow you to compose functions in a readable
 * and sequential manner. You can clearly see the flow of data and
 * the operations applied to it, making it easier to understand
 * and maintain the code.
 *
 * Code Organization: With pipelines, you can break down complex operations
 * into smaller, manageable functions.
 * Each function performs a specific task,
 * making your code more modular and easier to reason about.
 *
 * Reusability: Pipelines promote the reuse of functions.
 * By breaking down operations into smaller functions,
 * you can reuse them in different pipelines or contexts,
 * improving code reuse and reducing duplication.
 *
 * Type Safety: By leveraging the type system,
 * pipelines help catch errors at compile-time.
 * Functions in a pipeline have well-defined input and output types,
 * ensuring that the data flows correctly through
 * the pipeline and minimizing runtime errors.
 */
