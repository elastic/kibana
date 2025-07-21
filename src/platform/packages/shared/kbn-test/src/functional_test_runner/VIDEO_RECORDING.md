# Video Recording for Functional Tests

The Functional Test Runner (FTR) now supports video recording of test execution to help with debugging and test analysis.

## Overview

Video recording captures the browser screen during test execution, providing visual context for test failures and helping developers understand what happened during test runs.

## Usage

To enable video recording, use the `--record-video` flag when running functional tests:

```bash
node scripts/functional_test_runner --config test/functional/config.ts --record-video
```

## Features

- **Automatic Recording**: Videos are automatically started before tests begin and stopped when tests complete or fail
- **Smart File Naming**: Video files are named with the test configuration and timestamp for easy identification
- **High Quality**: Records at 1920x1080 resolution with optimized settings for clear playback
- **Multiple Formats**: Supports MP4, AVI, WebM, and MOV formats (default: MP4)
- **Error Handling**: Gracefully handles recording failures without breaking test execution

## Video Storage

Videos are saved to: `target/functional-tests/videos/`

File naming format: `{config-name}_{timestamp}.mp4`

Example: `dashboard_config_2024-07-18T20-45-01-000Z.mp4`

## Requirements

The video recording feature requires the `puppeteer-screen-recorder` package:

```bash
yarn add puppeteer-screen-recorder
```

## Configuration

The video recorder uses optimized settings by default:

- **Resolution**: 1920x1080
- **Frame Rate**: 25 FPS
- **Codec**: H.264 (libx264)
- **Preset**: ultrafast (for performance)
- **Bitrate**: 1000 kbps
- **Aspect Ratio**: 16:9

## Integration Points

The video recording integrates with the FTR lifecycle:

- **Start**: `beforeTests` lifecycle phase
- **Stop**: `cleanup` and `testFailure` lifecycle phases

## Error Handling

If video recording fails:
- A warning is logged but tests continue normally
- Missing dependency shows helpful installation message
- Browser service unavailability is gracefully handled

## Troubleshooting

### Video recording not working
1. Ensure `puppeteer-screen-recorder` is installed
2. Check that browser service is available in your test configuration
3. Verify write permissions to `target/functional-tests/videos/` directory

### Performance Impact
Video recording adds minimal overhead but may:
- Slightly increase test execution time
- Use additional disk space for video files
- Require more memory during recording

### Browser Compatibility
Video recording works with:
- Chrome/Chromium browsers (via Puppeteer)
- Headless and headed browser modes

## Implementation Details

The video recording is implemented in:
- `VideoRecorder` class: Core recording functionality
- `FunctionalTestRunner`: Lifecycle integration
- CLI: `--record-video` flag support

The implementation uses dynamic imports to handle the optional dependency gracefully, ensuring tests can run even without the video recording package installed.
