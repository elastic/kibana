# Building OneNavigation

This guide is for Elastic team members who need to build the `@kbn/one-navigation` package locally (e.g., for testing unreleased changes or contributing to the component).

## Prerequisites

- Node.js version specified in Kibana's `.nvmrc` (currently 22.17.1)
- Yarn package manager
- Access to the Kibana repository

## Building the Package

### 1. Clone Kibana Repository

If you haven't already:

```bash
git clone https://github.com/elastic/kibana.git
cd kibana
```

### 2. Install Dependencies

Bootstrap the Kibana monorepo:

```bash
yarn kbn bootstrap
```

This will install all dependencies and set up the Kibana development environment.

### 3. Build OneNavigation

There are two ways to build the package:

**Option A: From the packaging directory**

```bash
cd src/core/packages/chrome/navigation/packaging
./scripts/build.sh
```

**Option B: From Kibana root (recommended)**

```bash
./scripts/build_one_navigation.sh
```

### 4. Build Output

The build artifacts are generated in the `target/` directory:

```
src/core/packages/chrome/navigation/target/
├── index.js        # Bundled JavaScript (25.8 KB minified)
├── index.d.ts      # TypeScript definitions
├── package.json    # Package manifest
└── *.js.map        # Source maps
```

**Build artifacts:**
- **index.js**: Production-ready bundle with all dependencies bundled (minified)
- **index.d.ts**: TypeScript type definitions for the public API
- **package.json**: Package manifest with metadata and peer dependencies
- **Source maps**: For debugging the bundled code

## Testing Your Build

### Run the Example Application

The example application provides a comprehensive test environment:

```bash
cd src/core/packages/chrome/navigation/packaging/example
yarn start
```

This will:
1. Start a webpack dev server
2. Open http://localhost:3000 in your browser
3. Load the example application using your built OneNavigation package

### Verification Checklist

Verify the following features in the example app:

- [ ] Navigation renders correctly (both collapsed and expanded)
- [ ] Logo is visible and clickable
- [ ] Primary navigation items are displayed
- [ ] Nested/secondary menu items appear on hover/click
- [ ] Footer items are visible
- [ ] Active item highlighting works
- [ ] Toggle between collapsed/expanded states
- [ ] Click handling works for all items
- [ ] No console errors
- [ ] TypeScript compilation succeeds
- [ ] Styles render correctly (Emotion CSS-in-JS)

## Build Process Details

The build process consists of three main steps:

### 1. Webpack Bundling

Uses webpack to:
- Bundle all source files into a single JavaScript file
- Transpile TypeScript and JSX using Babel
- Externalize peer dependencies (React, EUI, Emotion)
- Apply minification in production mode
- Generate source maps

Configuration: `packaging/webpack.config.js`

### 2. TypeScript Definitions

Generates TypeScript `.d.ts` files using:
- Standalone type definitions in `react/types.ts`
- Simple `tsc` command (no complex configuration)
- Outputs clean, minimal type definitions

### 3. Package Manifest

Copies `package.json` to the output directory with:
- Package metadata
- Entry points (`main`, `types`)
- Peer dependencies
- License information

## Development Workflow

### Making Changes

1. **Edit source files** in `src/components/navigation/`
2. **Rebuild** using `./scripts/build_one_navigation.sh`
3. **Test** in the example app (it will auto-reload if dev server is running)
4. **Verify** TypeScript types are still correct

### Testing Changes in Another Application

If you want to test your local build in another Elastic application:

1. Build the package (see above)
2. In your application, temporarily point to the local build:
   ```json
   {
     "dependencies": {
       "@kbn/one-navigation": "file:../path/to/kibana/src/core/packages/chrome/navigation/target"
     }
   }
   ```
3. Run `yarn install` in your application
4. Test your changes

**Remember**: Revert to the published package version before committing.

## Troubleshooting Build Issues

### Node Version Mismatch

**Problem**: `The engine "node" is incompatible with this module`

**Solution**: Use the correct Node.js version via nvm:
```bash
nvm use
```

The build scripts automatically run `nvm use`, but you may need to install the required version first:
```bash
nvm install
```

### Webpack Build Fails

**Problem**: Webpack compilation errors

**Solution**:
1. Clear the target directory: `rm -rf target/`
2. Ensure dependencies are installed: `yarn kbn bootstrap`
3. Check for TypeScript errors in source files
4. Review webpack output for specific error messages

### TypeScript Errors

**Problem**: Type generation fails

**Solution**:
1. Verify `react/types.ts` has no syntax errors
2. Check that all exported types are properly defined
3. Ensure no imports are used in `types.ts` (all types should be inlined)
4. Run `npx tsc react/types.ts --noEmit` to check for type errors

### Example App Won't Start

**Problem**: `webpack: command not found` or similar

**Solution**:
1. Ensure you've run `yarn kbn bootstrap` from Kibana root
2. Use the `start.sh` script (not `yarn start` directly)
3. Verify the `start.sh` script has execute permissions: `chmod +x start.sh`

## Build Scripts Reference

### Main Build Script

**Location**: `packaging/scripts/build.sh`

**What it does**:
1. Switches to correct Node.js version (via nvm)
2. Cleans the target directory
3. Runs webpack build
4. Generates TypeScript definitions
5. Copies package.json to target
6. Cleans up temporary files

### Convenience Script

**Location**: `scripts/build_one_navigation.sh` (Kibana root)

**What it does**:
- Navigates to packaging directory
- Executes the main build script
- Provides a convenient entry point from Kibana root

## Related Documentation

- [README.md](./README.md) - Main package documentation
- [ROADMAP.md](./ROADMAP.md) - Implementation roadmap and architecture
- [ROADMAP_PROGRESS.md](./ROADMAP_PROGRESS.md) - Detailed progress tracking
- [example/README.md](./example/README.md) - Example application guide

---

**Package Version**: 1.0.0  
**Last Updated**: Initial release  
**Maintained by**: Shared UX and EUI teams

